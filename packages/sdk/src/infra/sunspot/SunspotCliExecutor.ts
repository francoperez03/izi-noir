import { spawn } from 'node:child_process';
import type { SunspotConfig, CliResult } from './types.js';
import { SunspotCliError } from './types.js';

/**
 * Executes Sunspot and Nargo CLI commands
 */
export class SunspotCliExecutor {
  constructor(private readonly config: SunspotConfig) {}

  /**
   * Execute a CLI command and return the result
   */
  private async execute(command: string, args: string[], cwd?: string): Promise<CliResult> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        cwd,
        timeout: this.config.timeoutMs,
        env: { ...process.env },
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (exitCode) => {
        const result: CliResult = {
          stdout,
          stderr,
          exitCode: exitCode ?? 1,
        };

        if (exitCode !== 0) {
          reject(new SunspotCliError(
            `Command failed: ${command} ${args.join(' ')}\n${stderr || stdout}`,
            `${command} ${args.join(' ')}`,
            exitCode ?? 1,
            stderr || stdout
          ));
        } else {
          resolve(result);
        }
      });

      proc.on('error', (error) => {
        const message = error.message.includes('ENOENT')
          ? `Binary not found: ${command}. Ensure it is installed and in PATH.`
          : `Failed to execute ${command}: ${error.message}`;

        reject(new SunspotCliError(
          message,
          `${command} ${args.join(' ')}`,
          1,
          error.message
        ));
      });
    });
  }

  /**
   * Run nargo compile in the project directory
   * Output: target/circuit.json
   */
  async nargoCompile(projectDir: string): Promise<CliResult> {
    return this.execute(this.config.nargoBinaryPath, ['compile'], projectDir);
  }

  /**
   * Run nargo execute to generate witness
   * Output: target/circuit.gz
   */
  async nargoExecute(projectDir: string): Promise<CliResult> {
    return this.execute(this.config.nargoBinaryPath, ['execute'], projectDir);
  }

  /**
   * Run sunspot compile to generate CCS
   * Input: circuit.json
   * Output: circuit.ccs (in same directory as input)
   */
  async sunspotCompile(circuitJsonPath: string): Promise<CliResult> {
    return this.execute(this.config.sunspotBinaryPath, ['compile', circuitJsonPath]);
  }

  /**
   * Run sunspot setup to generate proving and verification keys
   * Input: circuit.ccs
   * Output: circuit.pk, circuit.vk (in same directory as input)
   */
  async sunspotSetup(ccsPath: string): Promise<CliResult> {
    return this.execute(this.config.sunspotBinaryPath, ['setup', ccsPath]);
  }

  /**
   * Run sunspot prove to generate proof
   * Inputs: circuit.json, witness.gz, circuit.ccs, circuit.pk
   * Outputs: circuit.proof, circuit.pw (in same directory as ccs)
   */
  async sunspotProve(
    circuitJsonPath: string,
    witnessPath: string,
    ccsPath: string,
    pkPath: string
  ): Promise<CliResult> {
    return this.execute(this.config.sunspotBinaryPath, [
      'prove',
      circuitJsonPath,
      witnessPath,
      ccsPath,
      pkPath,
    ]);
  }

  /**
   * Run sunspot verify to verify a proof
   * Inputs: circuit.vk, circuit.proof, circuit.pw
   * Returns: true if verification succeeds
   */
  async sunspotVerify(
    vkPath: string,
    proofPath: string,
    publicWitnessPath: string
  ): Promise<CliResult> {
    return this.execute(this.config.sunspotBinaryPath, [
      'verify',
      vkPath,
      proofPath,
      publicWitnessPath,
    ]);
  }
}

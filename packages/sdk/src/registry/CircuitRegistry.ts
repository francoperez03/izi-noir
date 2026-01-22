/**
 * Circuit Registry for IZI-NOIR.
 *
 * Provides naming, versioning, and metadata management for JS circuits.
 * Enables circuit reuse and documentation generation.
 *
 * @example
 * ```typescript
 * import { CircuitRegistry } from '@izi-noir/sdk';
 *
 * const registry = new CircuitRegistry();
 *
 * // Register a circuit
 * registry.register({
 *   name: 'balance-check',
 *   version: '1.0.0',
 *   description: 'Proves balance >= minimum without revealing actual balance',
 *   jsCircuit: ([minimum], [balance]) => {
 *     assert(balance >= minimum);
 *   },
 *   publicInputs: [{ name: 'minimum', type: 'Field', description: 'Minimum required balance' }],
 *   privateInputs: [{ name: 'balance', type: 'Field', description: 'Actual balance (kept private)' }],
 *   tags: ['finance', 'privacy'],
 * });
 *
 * // Use the circuit
 * const circuit = registry.get('balance-check');
 * const result = await izi.createProof(circuit.jsCircuit, [100], [250]);
 * ```
 *
 * @module @izi-noir/sdk/registry
 */

import type { CircuitFunction } from '../domain/types.js';

/**
 * Input field definition with metadata.
 */
export interface CircuitInputDef {
  /** Name of the input */
  name: string;
  /** Type in Noir (Field, u8, u32, etc.) */
  type: 'Field' | 'u8' | 'u16' | 'u32' | 'u64' | 'bool' | string;
  /** Human-readable description */
  description?: string;
  /** Optional constraint or validation info */
  constraints?: string;
}

/**
 * Circuit definition with metadata.
 */
export interface CircuitDefinition {
  /** Unique identifier for the circuit */
  name: string;
  /** Semantic version (e.g., '1.0.0') */
  version: string;
  /** Human-readable description */
  description?: string;
  /** The JavaScript circuit function */
  jsCircuit: CircuitFunction;
  /** Public inputs metadata */
  publicInputs: CircuitInputDef[];
  /** Private inputs metadata */
  privateInputs: CircuitInputDef[];
  /** Optional tags for categorization */
  tags?: string[];
  /** Optional author information */
  author?: string;
  /** Optional license */
  license?: string;
}

/**
 * Registered circuit with computed metadata.
 */
export interface RegisteredCircuit extends CircuitDefinition {
  /** When the circuit was registered */
  registeredAt: Date;
  /** Unique identifier combining name and version */
  id: string;
  /** Hash of the circuit function for change detection */
  functionHash: string;
}

/**
 * Options for circuit lookup.
 */
export interface GetCircuitOptions {
  /** Specific version to get (default: latest) */
  version?: string;
}

/**
 * Circuit Registry.
 *
 * A registry for managing named, versioned circuits with rich metadata.
 * Provides features for:
 * - Semantic versioning
 * - Input/output documentation
 * - Tag-based categorization
 * - Change detection
 */
export class CircuitRegistry {
  private circuits: Map<string, RegisteredCircuit[]> = new Map();

  /**
   * Registers a new circuit.
   *
   * @param definition - Circuit definition with metadata
   * @returns The registered circuit with computed fields
   * @throws Error if circuit with same name and version exists
   */
  register(definition: CircuitDefinition): RegisteredCircuit {
    const { name, version } = definition;

    // Validate semver format (basic check)
    if (!/^\d+\.\d+\.\d+/.test(version)) {
      throw new Error(
        `Invalid version format: ${version}. Use semantic versioning (e.g., '1.0.0')`
      );
    }

    // Validate circuit function
    if (typeof definition.jsCircuit !== 'function') {
      throw new Error('jsCircuit must be a function');
    }

    // Check for existing version
    const existing = this.circuits.get(name) ?? [];
    if (existing.some((c) => c.version === version)) {
      throw new Error(
        `Circuit '${name}' version ${version} already registered. Use a new version.`
      );
    }

    // Compute function hash for change detection
    const functionHash = this.hashFunction(definition.jsCircuit);

    // Create registered circuit
    const registered: RegisteredCircuit = {
      ...definition,
      registeredAt: new Date(),
      id: `${name}@${version}`,
      functionHash,
    };

    // Store sorted by version (newest first)
    existing.push(registered);
    existing.sort((a, b) => this.compareVersions(b.version, a.version));
    this.circuits.set(name, existing);

    return registered;
  }

  /**
   * Gets a circuit by name.
   *
   * @param name - Circuit name
   * @param options - Lookup options (version, etc.)
   * @returns The circuit or undefined if not found
   */
  get(name: string, options?: GetCircuitOptions): RegisteredCircuit | undefined {
    const versions = this.circuits.get(name);
    if (!versions || versions.length === 0) {
      return undefined;
    }

    if (options?.version) {
      return versions.find((c) => c.version === options.version);
    }

    // Return latest version (first in sorted array)
    return versions[0];
  }

  /**
   * Gets all versions of a circuit.
   *
   * @param name - Circuit name
   * @returns Array of all registered versions
   */
  getVersions(name: string): RegisteredCircuit[] {
    return this.circuits.get(name) ?? [];
  }

  /**
   * Checks if a circuit exists.
   *
   * @param name - Circuit name
   * @param version - Optional specific version
   */
  has(name: string, version?: string): boolean {
    const circuit = this.get(name, version ? { version } : undefined);
    return circuit !== undefined;
  }

  /**
   * Gets all registered circuit names.
   */
  names(): string[] {
    return Array.from(this.circuits.keys());
  }

  /**
   * Gets all registered circuits.
   */
  all(): RegisteredCircuit[] {
    const result: RegisteredCircuit[] = [];
    for (const versions of this.circuits.values()) {
      result.push(...versions);
    }
    return result;
  }

  /**
   * Searches circuits by tag.
   *
   * @param tag - Tag to search for
   * @returns Circuits with matching tag
   */
  findByTag(tag: string): RegisteredCircuit[] {
    const result: RegisteredCircuit[] = [];
    for (const versions of this.circuits.values()) {
      for (const circuit of versions) {
        if (circuit.tags?.includes(tag)) {
          result.push(circuit);
        }
      }
    }
    return result;
  }

  /**
   * Removes a circuit from the registry.
   *
   * @param name - Circuit name
   * @param version - Optional specific version (removes all if not specified)
   * @returns true if circuit was removed
   */
  remove(name: string, version?: string): boolean {
    if (!version) {
      return this.circuits.delete(name);
    }

    const versions = this.circuits.get(name);
    if (!versions) return false;

    const index = versions.findIndex((c) => c.version === version);
    if (index === -1) return false;

    versions.splice(index, 1);
    if (versions.length === 0) {
      this.circuits.delete(name);
    }
    return true;
  }

  /**
   * Exports the registry to a serializable format.
   */
  export(): CircuitRegistryExport {
    const circuits: CircuitExportEntry[] = [];

    for (const [name, versions] of this.circuits) {
      for (const circuit of versions) {
        circuits.push({
          name: circuit.name,
          version: circuit.version,
          description: circuit.description,
          publicInputs: circuit.publicInputs,
          privateInputs: circuit.privateInputs,
          tags: circuit.tags,
          author: circuit.author,
          license: circuit.license,
          registeredAt: circuit.registeredAt.toISOString(),
          functionHash: circuit.functionHash,
          // Note: jsCircuit is not serializable
        });
      }
    }

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      circuits,
    };
  }

  /**
   * Generates documentation for a circuit.
   *
   * @param name - Circuit name
   * @returns Markdown documentation
   */
  generateDocs(name: string): string {
    const circuit = this.get(name);
    if (!circuit) {
      return `Circuit '${name}' not found.`;
    }

    const lines: string[] = [
      `# ${circuit.name}`,
      '',
      `**Version:** ${circuit.version}`,
    ];

    if (circuit.description) {
      lines.push('', circuit.description);
    }

    if (circuit.author) {
      lines.push('', `**Author:** ${circuit.author}`);
    }

    if (circuit.license) {
      lines.push(`**License:** ${circuit.license}`);
    }

    if (circuit.tags && circuit.tags.length > 0) {
      lines.push('', `**Tags:** ${circuit.tags.join(', ')}`);
    }

    lines.push('', '## Public Inputs', '');
    if (circuit.publicInputs.length === 0) {
      lines.push('None');
    } else {
      lines.push('| Name | Type | Description |', '|------|------|-------------|');
      for (const input of circuit.publicInputs) {
        lines.push(`| ${input.name} | ${input.type} | ${input.description ?? '-'} |`);
      }
    }

    lines.push('', '## Private Inputs', '');
    if (circuit.privateInputs.length === 0) {
      lines.push('None');
    } else {
      lines.push('| Name | Type | Description |', '|------|------|-------------|');
      for (const input of circuit.privateInputs) {
        lines.push(`| ${input.name} | ${input.type} | ${input.description ?? '-'} |`);
      }
    }

    lines.push('', '## Circuit Function', '', '```javascript', circuit.jsCircuit.toString(), '```');

    return lines.join('\n');
  }

  /**
   * Validates circuit inputs against the definition.
   *
   * @param name - Circuit name
   * @param publicInputs - Public inputs to validate
   * @param privateInputs - Private inputs to validate
   * @throws Error if validation fails
   */
  validateInputs(
    name: string,
    publicInputs: unknown[],
    privateInputs: unknown[]
  ): void {
    const circuit = this.get(name);
    if (!circuit) {
      throw new Error(`Circuit '${name}' not found`);
    }

    if (publicInputs.length !== circuit.publicInputs.length) {
      throw new Error(
        `Expected ${circuit.publicInputs.length} public inputs, got ${publicInputs.length}`
      );
    }

    if (privateInputs.length !== circuit.privateInputs.length) {
      throw new Error(
        `Expected ${circuit.privateInputs.length} private inputs, got ${privateInputs.length}`
      );
    }

    // Type validation based on input definitions
    for (let i = 0; i < publicInputs.length; i++) {
      this.validateInput(
        publicInputs[i],
        circuit.publicInputs[i],
        `public input '${circuit.publicInputs[i].name}'`
      );
    }

    for (let i = 0; i < privateInputs.length; i++) {
      this.validateInput(
        privateInputs[i],
        circuit.privateInputs[i],
        `private input '${circuit.privateInputs[i].name}'`
      );
    }
  }

  // Private helpers

  private hashFunction(fn: CircuitFunction): string {
    const str = fn.toString();
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  private compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map((n) => parseInt(n, 10));
    const partsB = b.split('.').map((n) => parseInt(n, 10));

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const numA = partsA[i] ?? 0;
      const numB = partsB[i] ?? 0;
      if (numA > numB) return 1;
      if (numA < numB) return -1;
    }
    return 0;
  }

  private validateInput(
    value: unknown,
    def: CircuitInputDef,
    location: string
  ): void {
    switch (def.type) {
      case 'bool':
        if (typeof value !== 'boolean' && value !== 0 && value !== 1) {
          throw new Error(`${location}: expected boolean, got ${typeof value}`);
        }
        break;
      case 'Field':
      case 'u8':
      case 'u16':
      case 'u32':
      case 'u64':
        if (typeof value !== 'number' && typeof value !== 'bigint') {
          throw new Error(`${location}: expected number/bigint, got ${typeof value}`);
        }
        break;
      default:
        // Unknown type, skip validation
        break;
    }
  }
}

/**
 * Serializable circuit entry (without the function).
 */
export interface CircuitExportEntry {
  name: string;
  version: string;
  description?: string;
  publicInputs: CircuitInputDef[];
  privateInputs: CircuitInputDef[];
  tags?: string[];
  author?: string;
  license?: string;
  registeredAt: string;
  functionHash: string;
}

/**
 * Serializable registry export.
 */
export interface CircuitRegistryExport {
  version: '1.0';
  exportedAt: string;
  circuits: CircuitExportEntry[];
}

/**
 * Creates a global registry singleton.
 */
let globalRegistry: CircuitRegistry | null = null;

export function getGlobalRegistry(): CircuitRegistry {
  if (!globalRegistry) {
    globalRegistry = new CircuitRegistry();
  }
  return globalRegistry;
}

/**
 * Decorator-style function to register a circuit with minimal boilerplate.
 *
 * @example
 * ```typescript
 * const balanceCheck = defineCircuit({
 *   name: 'balance-check',
 *   version: '1.0.0',
 *   publicInputs: [{ name: 'minimum', type: 'Field' }],
 *   privateInputs: [{ name: 'balance', type: 'Field' }],
 * }, ([minimum], [balance]) => {
 *   assert(balance >= minimum);
 * });
 *
 * // balanceCheck is now registered and contains the full definition
 * ```
 */
export function defineCircuit(
  metadata: Omit<CircuitDefinition, 'jsCircuit'>,
  jsCircuit: CircuitFunction
): RegisteredCircuit {
  const registry = getGlobalRegistry();
  return registry.register({ ...metadata, jsCircuit });
}

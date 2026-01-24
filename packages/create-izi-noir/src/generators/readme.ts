import type { ProjectOptions } from '../prompts/project.js';

export function generateReadme(options: ProjectOptions): string {
  return `# ${options.projectName}

ZK circuits built with [IZI-NOIR](https://github.com/izi-noir/izi-noir).

## Getting Started

\`\`\`bash
# Build circuits
npm run build

# Run tests
npm test

# Watch mode (rebuild on changes)
npm run dev
\`\`\`

## Project Structure

\`\`\`
${options.projectName}/
├── circuits/           # Your ZK circuit definitions
│   ├── *.ts           # Circuits as JS functions with assert()
│   └── index.ts       # Re-exports
├── generated/          # Compiled circuits (auto-generated)
│   ├── *.json         # Compiled circuit artifacts
│   └── index.ts       # Typed re-exports
├── scripts/
│   └── test-proof.ts  # Local test script
├── izi-noir.config.ts # Build configuration
└── package.json
\`\`\`

## Writing Circuits

Circuits are JavaScript functions with \`assert()\` statements:

\`\`\`typescript
// circuits/my-circuit.ts
export function myCircuit(
  [publicInput]: [number],
  [privateInput]: [number]
): void {
  assert(privateInput >= publicInput);
}
\`\`\`

## Usage in Frontend

\`\`\`typescript
import { IziNoir, Provider } from '@izi-noir/sdk';
import { myCircuit } from '${options.projectName}/circuits';

const izi = await IziNoir.init({ provider: Provider.Arkworks });

const proof = await izi.createProof(
  myCircuit,
  [100],    // public inputs
  [1500]    // private inputs (hidden)
);

console.log(proof.verified); // true
\`\`\`

## Publishing

\`\`\`bash
npm publish
\`\`\`

Your circuits can then be installed as a dependency in other projects.

## Learn More

- [IZI-NOIR Documentation](https://github.com/izi-noir/izi-noir)
- [Noir Language](https://noir-lang.org)
`;
}

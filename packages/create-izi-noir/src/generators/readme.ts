import type { ProjectOptions } from '../prompts/project.js';

export function generateReadme(options: ProjectOptions): string {
  const isSolana = options.provider === 'arkworks';
  const networkInfo = isSolana
    ? '- Deploy VK to Solana devnet\n- Verify proofs on-chain'
    : '- Local proof verification';

  return `# ${options.projectName}

ZK proof demo built with [IZI-NOIR](https://github.com/izi-noir) and React.

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
\`\`\`

Then open http://localhost:5173 in your browser.

## Features

- Interactive circuit selection
- Real-time proof generation
- Syntax-highlighted code display
${networkInfo}

## Project Structure

\`\`\`
${options.projectName}/
├── src/
│   ├── App.tsx          # Main demo component
│   ├── main.tsx         # React entry point
│   ├── components/      # Reusable components
│   └── lib/             # Utility functions
├── circuits/            # Your ZK circuit definitions
│   ├── *.ts            # Circuits as JS functions with assert()
│   └── index.ts        # Re-exports
├── vite.config.ts       # Vite configuration
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

After adding a new circuit:
1. Export it from \`circuits/index.ts\`
2. Add it to the CIRCUITS array in \`src/App.tsx\`

## Learn More

- [IZI-NOIR Documentation](https://github.com/izi-noir)
- [Noir Language](https://noir-lang.org)
- [Vite](https://vitejs.dev)
- [React](https://react.dev)
`;
}
